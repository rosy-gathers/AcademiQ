"""exam attempt metadata

Revision ID: 20260529_0004
Revises: 20260528_0003
Create Date: 2026-05-29

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260529_0004"
down_revision: Union[str, None] = "20260528_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("quiz_attempts") as batch_op:
        batch_op.add_column(sa.Column("mode", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("time_limit_seconds", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("elapsed_seconds", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("quiz_attempts") as batch_op:
        batch_op.drop_column("elapsed_seconds")
        batch_op.drop_column("time_limit_seconds")
        batch_op.drop_column("mode")
