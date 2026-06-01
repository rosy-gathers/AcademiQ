"""audio transcript metadata on documents

Revision ID: 20260531_0006
Revises: 20260530_0005
Create Date: 2026-05-31

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260531_0006"
down_revision: Union[str, None] = "20260530_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("documents") as batch_op:
        batch_op.add_column(sa.Column("source_type", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("transcript_data", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("duration_seconds", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("documents") as batch_op:
        batch_op.drop_column("duration_seconds")
        batch_op.drop_column("transcript_data")
        batch_op.drop_column("source_type")
