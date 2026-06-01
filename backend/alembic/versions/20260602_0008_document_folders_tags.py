"""document folders and tags

Revision ID: 20260602_0008
Revises: 20260601_0007
Create Date: 2026-06-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260602_0008"
down_revision: Union[str, None] = "20260601_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("documents") as batch_op:
        batch_op.add_column(sa.Column("folder", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("tags", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("documents") as batch_op:
        batch_op.drop_column("tags")
        batch_op.drop_column("folder")
